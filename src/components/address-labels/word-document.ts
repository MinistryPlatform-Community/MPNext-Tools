import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  SectionType,
  PageOrientation,
} from 'docx';
import type { LabelStockConfig } from '@/lib/label-stock';
import type { LabelData } from '@/lib/dto';
import { imbBarcodeToBmp, postnetBarcodeToBmp } from '@/lib/barcode-image';

// Convert points to inches (72pt = 1in)
const ptToIn = (pt: number) => pt / 72;

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

function buildLabelCell(
  label: LabelData | null,
  stock: LabelStockConfig
): TableCell {
  const cellWidthTwips = convertInchesToTwip(ptToIn(stock.labelWidth));
  const cellHeightTwips = convertInchesToTwip(ptToIn(stock.labelHeight));

  if (!label) {
    // Empty cell (for start position offset)
    return new TableCell({
      width: { size: cellWidthTwips, type: WidthType.DXA },
      borders: NO_BORDER,
      children: [new Paragraph({ spacing: { after: 0 } })],
    });
  }

  const cityStateZip = [
    label.city,
    label.state ? `, ${label.state}` : '',
    label.postalCode ? `  ${label.postalCode}` : '',
  ].join('');

  const paragraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 20 },
      children: [new TextRun({ text: label.name, bold: true, size: 16, font: 'Arial' })],
    }),
    new Paragraph({
      spacing: { after: 20 },
      children: [new TextRun({ text: label.addressLine1, size: 16, font: 'Arial' })],
    }),
  ];

  if (label.addressLine2) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: label.addressLine2, size: 16, font: 'Arial' })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: cityStateZip, size: 16, font: 'Arial' })],
    })
  );

  // Add barcode image if available
  if (label.barStates && label.barType) {
    const bmpBuffer = label.barType === 'imb'
      ? imbBarcodeToBmp(label.barStates, 200, 30)
      : postnetBarcodeToBmp(label.barStates, 200, 24);

    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: bmpBuffer,
            transformation: {
              width: convertInchesToTwip(ptToIn(stock.labelWidth * 0.65)) / 15, // EMU to px approx
              height: label.barType === 'imb' ? 18 : 14,
            },
            type: 'bmp',
          }),
        ],
      })
    );
  }

  return new TableCell({
    width: { size: cellWidthTwips, type: WidthType.DXA },
    borders: NO_BORDER,
    margins: {
      top: convertInchesToTwip(0.05),
      bottom: convertInchesToTwip(0.05),
      left: convertInchesToTwip(0.08),
      right: convertInchesToTwip(0.08),
    },
    children: paragraphs,
  });
}

export function buildWordDocument(
  labels: LabelData[],
  stock: LabelStockConfig,
  startPosition: number
): Document {
  const skipCount = startPosition - 1;
  const labelsPerPage = stock.columns * stock.rows;
  const totalSlots = skipCount + labels.length;
  const pageCount = Math.max(1, Math.ceil(totalSlots / labelsPerPage));

  const sections = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const rows: TableRow[] = [];

    for (let row = 0; row < stock.rows; row++) {
      const cells: TableCell[] = [];

      for (let col = 0; col < stock.columns; col++) {
        const globalSlot = pageIndex * labelsPerPage + row * stock.columns + col;
        const labelIndex = globalSlot - skipCount;

        if (labelIndex < 0 || labelIndex >= labels.length) {
          cells.push(buildLabelCell(null, stock));
        } else {
          cells.push(buildLabelCell(labels[labelIndex], stock));
        }
      }

      rows.push(
        new TableRow({
          children: cells,
          height: { value: convertInchesToTwip(ptToIn(stock.labelHeight)), rule: 'exact' as const },
        })
      );
    }

    sections.push({
      properties: {
        type: pageIndex > 0 ? SectionType.NEXT_PAGE : undefined,
        page: {
          size: {
            width: convertInchesToTwip(ptToIn(stock.pageWidth)),
            height: convertInchesToTwip(ptToIn(stock.pageHeight)),
            orientation: PageOrientation.PORTRAIT,
          },
          margin: {
            top: convertInchesToTwip(ptToIn(stock.marginTop)),
            bottom: convertInchesToTwip(0.25),
            left: convertInchesToTwip(ptToIn(stock.marginLeft)),
            right: convertInchesToTwip(ptToIn(stock.marginLeft)),
          },
        },
      },
      children: [
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: NO_BORDER,
        }),
      ],
    });
  }

  return new Document({ sections });
}
