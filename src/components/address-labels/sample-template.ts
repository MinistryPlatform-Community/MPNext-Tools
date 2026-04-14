'use server';

import { Document, Paragraph, TextRun, Packer, PageBreak } from 'docx';

/**
 * Generates a sample .docx template with merge tokens pre-placed
 * for window envelope mailing. Users can customize this in Word
 * (add letterhead, change fonts) then re-upload it to the Mail Merge
 * tool to generate merged letters with one page per address and
 * embedded barcode images.
 *
 * Returns base64-encoded .docx content.
 */
export async function generateSampleTemplate(): Promise<string> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch
            bottom: 1440,
            left: 1080,   // 0.75 inch
            right: 1080,
          },
        },
      },
      children: [
        // Instructions paragraph (user can delete before merging)
        new Paragraph({
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: 'INSTRUCTIONS: Customize this template with your letterhead, then upload it to the Mail Merge tool. Delete this paragraph before merging. Tokens in {curly braces} will be replaced with address data.',
              italics: true,
              size: 18,
              font: 'Arial',
              color: '888888',
            }),
          ],
        }),

        // Loop start marker (invisible: tiny white text)
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{#addresses}', size: 2, color: 'FFFFFF' }),
          ],
        }),

        // Spacer paragraphs to position address block for window envelope (~2" from top)
        ...Array.from({ length: 4 }, () =>
          new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '', size: 20 })] })
        ),

        // Address block
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: '{Name}', bold: true, size: 22, font: 'Arial' })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: '{AddressLine1}', size: 22, font: 'Arial' })],
        }),

        // Conditional AddressLine2 start (invisible)
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{#AddressLine2}', size: 2, color: 'FFFFFF' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: '{AddressLine2}', size: 22, font: 'Arial' })],
        }),
        // Conditional AddressLine2 end (invisible)
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{/AddressLine2}', size: 2, color: 'FFFFFF' }),
          ],
        }),

        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: '{City}, {State}  {PostalCode}', size: 22, font: 'Arial' }),
          ],
        }),

        // Barcode image placeholder (% prefix for docxtemplater-image-module-free)
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: '{%Barcode}', size: 22, font: 'Arial' })],
        }),

        // Conditional page break start (invisible — not on last page)
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{#isNotLast}', size: 2, color: 'FFFFFF' }),
          ],
        }),
        new Paragraph({
          children: [new PageBreak()],
        }),
        // Conditional page break end (invisible)
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{/isNotLast}', size: 2, color: 'FFFFFF' }),
          ],
        }),

        // Loop end marker (invisible)
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({ text: '{/addresses}', size: 2, color: 'FFFFFF' }),
          ],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer).toString('base64');
}
