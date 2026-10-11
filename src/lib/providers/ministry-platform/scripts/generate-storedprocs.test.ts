import { describe, it, expect, vi } from 'vitest';

// The script loads .env files and imports the MP client at module scope; keep
// both out of the test process.
vi.mock('dotenv', () => ({ config: vi.fn() }));
vi.mock('../helper', () => ({ MPHelper: class {} }));

import { STORED_PROCS_DOC_PATH, generateDocument, formatParamSignature } from './generate-storedprocs';
import type { ProcedureInfo } from '../types';

const procs = [
  {
    Name: 'api_Foo_Get',
    Parameters: [
      { Name: '@Id', DataType: 'Integer32', Size: 4, Direction: 'Input' },
      { Name: '@Name', DataType: 'String', Size: 50, Direction: 'Input' },
      { Name: '@RETURN_VALUE', DataType: 'Integer32', Size: 4, Direction: 'ReturnValue' },
    ],
  },
  { Name: 'cleanup', Parameters: [] },
] as unknown as ProcedureInfo[];

describe('generate-storedprocs', () => {
  const now = new Date('2026-10-11T08:00:00.000Z');

  it('defaults to the committed mp-schema catalog', () => {
    expect(STORED_PROCS_DOC_PATH).toBe('.claude/references/mp-schema/stored-procs.md');
  });

  it('emits the catalog frontmatter with last_verified', () => {
    const md = generateDocument(procs, undefined, now);
    expect(
      md.startsWith(
        '---\ntitle: Ministry Platform Stored Procedures\ndomain: mp-schema\ntype: generated-reference\n' +
          'last_verified: 2026-10-11\nsource: npm run mp:generate:storedprocs\n---\n',
      ),
    ).toBe(true);
    expect(md).toContain('## How to call');
    expect(md).toContain('**Generated (source):** 2026-10-11T08:00:00.000Z');
    expect(md).toContain('**Procedures:** 2');
    expect(md).not.toContain('**Filter:**');
  });

  it('groups by prefix with Other last and records a filter', () => {
    const md = generateDocument(procs, 'Foo', now);
    expect(md).toContain('**Filter:** "Foo"');
    expect(md.indexOf('### api_* (1)')).toBeLessThan(md.indexOf('### Other (1)'));
    expect(md).toContain('- `api_Foo_Get(@Id: Integer32, @Name: String(50))`');
    expect(md).toContain('- `cleanup(no parameters)`');
  });

  it('omits the return value from signatures', () => {
    expect(formatParamSignature(procs[0].Parameters)).not.toContain('RETURN_VALUE');
  });
});
