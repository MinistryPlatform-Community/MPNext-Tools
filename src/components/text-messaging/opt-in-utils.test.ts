import { describe, expect, it } from 'vitest';
import { TEXTING_COMPLIANCE_LEVEL, TEXTING_OPT_IN_TYPE } from '@/lib/constants';
import { meetsTextingCompliance, requiresDoubleOptIn } from './opt-in-utils';

const { OPTED_OUT, NO_RESPONSE, SINGLE_OPT_IN, DOUBLE_OPT_IN } = TEXTING_OPT_IN_TYPE;

describe('opt-in-utils', () => {
  describe('requiresDoubleOptIn', () => {
    it('is true only for the Double Opt-in compliance level', () => {
      expect(requiresDoubleOptIn(TEXTING_COMPLIANCE_LEVEL.DOUBLE_OPT_IN)).toBe(true);
      expect(requiresDoubleOptIn(TEXTING_COMPLIANCE_LEVEL.SINGLE_OPT_IN)).toBe(false);
      expect(requiresDoubleOptIn(TEXTING_COMPLIANCE_LEVEL.NONE)).toBe(false);
      expect(requiresDoubleOptIn(null)).toBe(false);
      expect(requiresDoubleOptIn(undefined)).toBe(false);
    });
  });

  describe('meetsTextingCompliance', () => {
    it.each([TEXTING_COMPLIANCE_LEVEL.NONE, TEXTING_COMPLIANCE_LEVEL.SINGLE_OPT_IN, null, undefined])(
      'allows single or double opt-in contacts for compliance level %s',
      (level) => {
        expect(meetsTextingCompliance(OPTED_OUT, level)).toBe(false);
        expect(meetsTextingCompliance(NO_RESPONSE, level)).toBe(false);
        expect(meetsTextingCompliance(SINGLE_OPT_IN, level)).toBe(true);
        expect(meetsTextingCompliance(DOUBLE_OPT_IN, level)).toBe(true);
      }
    );

    it('allows only double opt-in contacts for a double opt-in number', () => {
      const level = TEXTING_COMPLIANCE_LEVEL.DOUBLE_OPT_IN;
      expect(meetsTextingCompliance(OPTED_OUT, level)).toBe(false);
      expect(meetsTextingCompliance(NO_RESPONSE, level)).toBe(false);
      expect(meetsTextingCompliance(SINGLE_OPT_IN, level)).toBe(false);
      expect(meetsTextingCompliance(DOUBLE_OPT_IN, level)).toBe(true);
    });

    it('never texts a contact with no opt-in type', () => {
      expect(meetsTextingCompliance(null, TEXTING_COMPLIANCE_LEVEL.NONE)).toBe(false);
      expect(meetsTextingCompliance(undefined, TEXTING_COMPLIANCE_LEVEL.DOUBLE_OPT_IN)).toBe(false);
    });
  });
});
