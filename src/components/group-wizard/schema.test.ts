import { describe, it, expect } from 'vitest';
import {
  groupWizardSchema,
  GROUP_WIZARD_DEFAULTS,
  STEP_FIELDS,
  type GroupWizardFormData,
} from './schema';

/** Helper: fill all required IDs so schema passes base validation */
function validBase(): GroupWizardFormData {
  return {
    ...GROUP_WIZARD_DEFAULTS,
    Group_Name: 'Valid Group',
    Group_Type_ID: 1,
    Congregation_ID: 1,
    Ministry_ID: 1,
    Primary_Contact: 42,
  };
}

describe('groupWizardSchema', () => {
  it('rejects GROUP_WIZARD_DEFAULTS because required IDs are undefined', () => {
    const result = groupWizardSchema.safeParse(GROUP_WIZARD_DEFAULTS);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toEqual(expect.arrayContaining(['Group_Type_ID', 'Congregation_ID', 'Ministry_ID', 'Primary_Contact']));
    }
  });

  it('accepts a record with all required fields populated', () => {
    const result = groupWizardSchema.safeParse(validBase());
    expect(result.success).toBe(true);
  });

  it('rejects an empty Group_Name with the "required" message', () => {
    const result = groupWizardSchema.safeParse({ ...validBase(), Group_Name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'Group_Name');
      expect(issue?.message).toBe('Group name is required');
    }
  });

  it('rejects Group_Name exceeding 75 characters', () => {
    const longName = 'x'.repeat(76);
    const result = groupWizardSchema.safeParse({ ...validBase(), Group_Name: longName });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'Group_Name');
      expect(issue?.message).toBe('Max 75 characters');
    }
  });

  it('accepts Group_Name exactly 75 characters', () => {
    const exactName = 'x'.repeat(75);
    const result = groupWizardSchema.safeParse({ ...validBase(), Group_Name: exactName });
    expect(result.success).toBe(true);
  });

  it('rejects Description exceeding 2000 characters', () => {
    const longDesc = 'x'.repeat(2001);
    const result = groupWizardSchema.safeParse({ ...validBase(), Description: longDesc });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'Description');
      expect(issue?.message).toBe('Max 2000 characters');
    }
  });

  it('accepts Description exactly 2000 characters', () => {
    const exactDesc = 'x'.repeat(2000);
    const result = groupWizardSchema.safeParse({ ...validBase(), Description: exactDesc });
    expect(result.success).toBe(true);
  });

  it('requires Start_Date to be non-empty', () => {
    const result = groupWizardSchema.safeParse({ ...validBase(), Start_Date: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'Start_Date');
      expect(issue?.message).toBe('Start date is required');
    }
  });

  it('rejects a non-positive Target_Size', () => {
    const result = groupWizardSchema.safeParse({ ...validBase(), Target_Size: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'Target_Size');
      expect(issue?.message).toBe('Must be a positive number');
    }
  });

  it('accepts the bracket-accessed Secure_Check-in boolean', () => {
    const data = { ...validBase(), 'Secure_Check-in': true };
    const result = groupWizardSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data['Secure_Check-in']).toBe(true);
    }
  });
});

describe('STEP_FIELDS', () => {
  it('STEP_FIELDS[5] is an empty array (review step has no fields to validate)', () => {
    expect(STEP_FIELDS[5]).toEqual([]);
  });

  it('STEP_FIELDS covers all 6 wizard steps', () => {
    expect(Object.keys(STEP_FIELDS)).toEqual(['0', '1', '2', '3', '4', '5']);
  });

  it('STEP_FIELDS[4] includes the hyphenated Secure_Check-in field name', () => {
    expect(STEP_FIELDS[4]).toContain('Secure_Check-in');
  });

  it('STEP_FIELDS[0] includes Group_Name and Group_Type_ID', () => {
    expect(STEP_FIELDS[0]).toEqual(expect.arrayContaining(['Group_Name', 'Group_Type_ID']));
  });

  it('STEP_FIELDS[1] includes the required org fields', () => {
    expect(STEP_FIELDS[1]).toEqual(
      expect.arrayContaining(['Congregation_ID', 'Ministry_ID', 'Primary_Contact']),
    );
  });
});

describe('GROUP_WIZARD_DEFAULTS', () => {
  it('has Start_Date pre-populated with today (YYYY-MM-DD)', () => {
    expect(GROUP_WIZARD_DEFAULTS.Start_Date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('defaults all boolean flags to false', () => {
    expect(GROUP_WIZARD_DEFAULTS.Meets_Online).toBe(false);
    expect(GROUP_WIZARD_DEFAULTS.Group_Is_Full).toBe(false);
    expect(GROUP_WIZARD_DEFAULTS.Available_Online).toBe(false);
    expect(GROUP_WIZARD_DEFAULTS['Secure_Check-in']).toBe(false);
  });

  it('defaults Available_On_App to null (tri-state boolean)', () => {
    expect(GROUP_WIZARD_DEFAULTS.Available_On_App).toBeNull();
  });
});
