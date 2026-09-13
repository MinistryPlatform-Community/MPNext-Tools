import { describe, it, expect } from 'vitest';

import { SERVICE_TYPES } from './address-label.dto';

/**
 * SERVICE_TYPES feeds the USPS Service Type Identifier (STID) field of an
 * Intelligent Mail barcode. A malformed id here produces a barcode the Postal
 * Service rejects, so the shape is pinned rather than left to review.
 */

describe('SERVICE_TYPES', () => {
  it('offers the five supported mail classes', () => {
    expect(SERVICE_TYPES).toHaveLength(5);
  });

  it('uses exactly three digits for every service type id, as the IMb STID requires', () => {
    for (const type of SERVICE_TYPES) {
      expect(type.id).toMatch(/^\d{3}$/);
    }
  });

  it('gives every entry a non-empty display name', () => {
    for (const type of SERVICE_TYPES) {
      expect(type.name.trim()).not.toBe('');
    }
  });

  it('has no duplicate ids', () => {
    const ids = SERVICE_TYPES.map((t) => t.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes First-Class Mail as service type 040', () => {
    expect(SERVICE_TYPES).toContainEqual({ id: '040', name: 'First-Class Mail' });
  });
});
