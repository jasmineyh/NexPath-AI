import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCvText, extractCvText, normalizeExtractedText } from './cv-extract.ts';

describe('CV extraction helpers', () => {
  it('normalizes pasted text and preserves resume content', () => {
    const input = 'Aisha Tan\n\nEducation:\nBachelor of Computer Science\nUniversity of Malaya\n2021-2025\n\nSkills:\nPython, SQL, Tableau\n';
    const output = normalizeExtractedText(input);

    assert.ok(output.includes('Aisha Tan'));
    assert.ok(output.includes('Bachelor of Computer Science'));
    assert.ok(output.includes('Python, SQL, Tableau'));
    assert.ok(!output.includes('\n\n\n'));
  });

  it('accepts a text-based resume file', async () => {
    const resume = `Aisha Tan
+60 12-345 6789
 aisha.tan@email.com

Education
Bachelor of Computer Science (Hons)
University of Malaya
2021 - 2025

Skills
Python, SQL, Power BI, Figma
`;

    const file = new File([resume], 'aisha-resume.txt', { type: 'text/plain' });
    const text = await extractCvText(file);

    assert.ok(text.includes('Aisha Tan'));
    assert.ok(text.includes('University of Malaya'));
    assert.ok(text.includes('Python'));
  });

  it('rejects malformed PDFs with a clear error', async () => {
    const file = new File(['not a valid pdf file'], 'broken-resume.pdf', { type: 'application/pdf' });

    await assert.rejects(extractCvText(file), (err: unknown) => {
      if (!(err instanceof Error)) return false;
      return 'kind' in (err as object) && (err as { kind?: string }).kind === 'corrupt';
    });
  });

  it('detects unreadable or image-only CV text', () => {
    const result = classifyCvText('   ');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'scanned');
  });
});
