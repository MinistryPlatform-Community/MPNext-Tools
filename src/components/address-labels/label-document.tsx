import { Document, Page, View, StyleSheet } from '@react-pdf/renderer';
import { AddressLabel } from './address-label';
import { getLabelPosition } from '@/lib/label-stock';
import type { LabelStockConfig } from '@/lib/label-stock';
import type { LabelData } from '@/lib/dto';

const styles = StyleSheet.create({
  page: {
    position: 'relative',
  },
});

interface LabelDocumentProps {
  labels: LabelData[];
  stock: LabelStockConfig;
  startPosition: number;
}

export function LabelDocument({
  labels,
  stock,
  startPosition,
}: LabelDocumentProps) {
  const skipCount = startPosition - 1;
  const totalSlots = skipCount + labels.length;
  const labelsPerPage = stock.columns * stock.rows;
  const pageCount = Math.max(1, Math.ceil(totalSlots / labelsPerPage));

  const pages: React.ReactNode[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const labelsOnPage: React.ReactNode[] = [];

    for (let slot = 0; slot < labelsPerPage; slot++) {
      const globalSlot = pageIndex * labelsPerPage + slot;
      const labelIndex = globalSlot - skipCount;
      const pos = getLabelPosition(stock, globalSlot);

      if (labelIndex < 0 || labelIndex >= labels.length) continue;

      labelsOnPage.push(
        <View
          key={globalSlot}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: stock.labelWidth,
            height: stock.labelHeight,
          }}
        >
          <AddressLabel
            data={labels[labelIndex]}
            width={stock.labelWidth}
            height={stock.labelHeight}
          />
        </View>,
      );
    }

    pages.push(
      <Page
        key={pageIndex}
        size={[stock.pageWidth, stock.pageHeight]}
        style={styles.page}
      >
        {labelsOnPage}
      </Page>,
    );
  }

  return <Document>{pages}</Document>;
}
