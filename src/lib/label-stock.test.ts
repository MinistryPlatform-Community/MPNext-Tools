import { describe, it, expect } from 'vitest';
import { LABEL_STOCKS, getLabelStock, getLabelPosition } from './label-stock';

describe('label-stock', () => {
  describe('LABEL_STOCKS', () => {
    it('should define 4 label stock configurations', () => {
      expect(LABEL_STOCKS).toHaveLength(4);
    });

    it('should include Avery 5160 with correct dimensions', () => {
      const stock = getLabelStock('5160');
      expect(stock).toBeDefined();
      expect(stock!.columns).toBe(3);
      expect(stock!.rows).toBe(10);
      expect(stock!.labelWidth).toBeCloseTo(189, 0);
      expect(stock!.labelHeight).toBeCloseTo(72, 0);
    });

    it('should include Avery 5163 with correct layout', () => {
      const stock = getLabelStock('5163');
      expect(stock).toBeDefined();
      expect(stock!.columns).toBe(2);
      expect(stock!.rows).toBe(5);
    });
  });

  describe('getLabelStock', () => {
    it('should return undefined for unknown stock ID', () => {
      expect(getLabelStock('9999')).toBeUndefined();
    });
  });

  describe('getLabelPosition', () => {
    it('should calculate position for first label on 5160', () => {
      const stock = getLabelStock('5160')!;
      const pos = getLabelPosition(stock, 0);
      expect(pos.x).toBeCloseTo(stock.marginLeft);
      expect(pos.y).toBeCloseTo(stock.marginTop);
      expect(pos.page).toBe(0);
    });

    it('should calculate position for second column on 5160', () => {
      const stock = getLabelStock('5160')!;
      const pos = getLabelPosition(stock, 1);
      expect(pos.x).toBeCloseTo(stock.marginLeft + stock.labelWidth + stock.columnGap);
      expect(pos.page).toBe(0);
    });

    it('should calculate position for second row on 5160', () => {
      const stock = getLabelStock('5160')!;
      const pos = getLabelPosition(stock, 3);
      expect(pos.x).toBeCloseTo(stock.marginLeft);
      expect(pos.y).toBeCloseTo(stock.marginTop + stock.labelHeight + stock.rowGap);
      expect(pos.page).toBe(0);
    });

    it('should wrap to next page when sheet is full', () => {
      const stock = getLabelStock('5160')!;
      const labelsPerPage = stock.columns * stock.rows;
      const pos = getLabelPosition(stock, labelsPerPage);
      expect(pos.page).toBe(1);
      expect(pos.x).toBeCloseTo(stock.marginLeft);
      expect(pos.y).toBeCloseTo(stock.marginTop);
    });

    it('should handle start position offset', () => {
      const stock = getLabelStock('5160')!;
      const pos = getLabelPosition(stock, 3);
      expect(pos.x).toBeCloseTo(stock.marginLeft);
      expect(pos.y).toBeCloseTo(stock.marginTop + stock.labelHeight + stock.rowGap);
    });
  });
});
