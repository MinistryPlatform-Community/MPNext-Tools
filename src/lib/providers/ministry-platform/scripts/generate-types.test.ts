import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

// The script loads .env files and imports the MP client at module scope; keep
// both out of the test process.
vi.mock('dotenv', () => ({ config: vi.fn() }));
vi.mock('../helper', () => ({ MPHelper: class {} }));

import {
  MP_DATE_PATTERN,
  MP_DATETIME_PATTERN,
  SCHEMA_DOC_PATH,
  generateIndexFile,
  generateSchemaDocument,
  generateZodSchema,
  mapDataTypeToZod,
} from './generate-types';
import type { TableMetadata } from '../types';

type Col = Parameters<typeof mapDataTypeToZod>[0];
const col = (DataType: Col['DataType'], IsRequired = true): Col =>
  ({ Name: 'X', DataType, IsRequired, Size: 0 }) as Col;

/** Evaluate an emitted zod expression the way the generated file would. */
function evalZod(expr: string): z.ZodType {
  return new Function('z', `return ${expr};`)(z) as z.ZodType;
}

describe('mapDataTypeToZod — DateTime/Timestamp', () => {
  const accepts = [
    '2026-05-17 14:30:00', // DomainTimezoneService.toMpSqlDatetime output
    '2026-05-17 14:30',
    '2026-05-17T14:30:00', // what MP returns on reads
    '2026-05-17T14:30:00.123',
    '2026-05-17T14:30:00.1234567',
    '2026-05-17T03:33:00.000Z', // ISO instant
    '2026-05-17T03:33:00-04:00',
    '2026-05-17 03:33:00+0530',
  ];
  const rejects = [
    '2026-05-17',
    '14:30:00',
    '2026-05-17 14',
    '2026/05/17 14:30:00',
    'not a date',
    '',
    '2026-05-17 14:30:00 junk',
  ];

  it.each(['DateTime', 'Timestamp'] as const)('%s emits a regex, not z.string().datetime()', (t) => {
    const out = mapDataTypeToZod(col(t));
    expect(out).not.toContain('.datetime(');
    expect(out).toContain('.regex(');
  });

  it.each(accepts)('accepts %j', (v) => {
    expect(evalZod(mapDataTypeToZod(col('DateTime'))).safeParse(v).success).toBe(true);
  });

  it.each(rejects)('rejects %j', (v) => {
    expect(evalZod(mapDataTypeToZod(col('DateTime'))).safeParse(v).success).toBe(false);
  });

  it('is nullable when not required', () => {
    const schema = evalZod(mapDataTypeToZod(col('DateTime', false)));
    expect(schema.safeParse(null).success).toBe(true);
    expect(schema.safeParse('2026-05-17 14:30:00').success).toBe(true);
  });

  it('emits the exported pattern', () => {
    expect(mapDataTypeToZod(col('DateTime'))).toContain(`/${MP_DATETIME_PATTERN}/`);
  });
});

describe('mapDataTypeToZod — Date', () => {
  it.each(['2026-05-17', '2026-05-17 00:00:00', '2026-05-17T00:00:00', '2026-05-17T00:00:00Z'])(
    'accepts %j',
    (v) => {
      expect(evalZod(mapDataTypeToZod(col('Date'))).safeParse(v).success).toBe(true);
    },
  );

  it.each(['05/17/2026', '2026-5-17', '2026-05-17 junk'])('rejects %j', (v) => {
    expect(evalZod(mapDataTypeToZod(col('Date'))).safeParse(v).success).toBe(false);
  });

  it('emits the exported pattern', () => {
    expect(mapDataTypeToZod(col('Date'))).toContain(`/${MP_DATE_PATTERN}/`);
  });
});

describe('generateZodSchema', () => {
  it('produces a standalone module whose datetime field accepts MP wall-clock', () => {
    const table = {
      Name: 'Contact_Log',
      Columns: [
        { Name: 'Contact_Log_ID', DataType: 'Integer32', IsRequired: true, Size: 4 },
        { Name: 'Contact_Date', DataType: 'DateTime', IsRequired: true, Size: 8 },
        { Name: 'Notes', DataType: 'String', IsRequired: false, Size: 2000 },
      ],
    } as unknown as TableMetadata;
    const src = generateZodSchema(table, 'Contact_Log');
    expect(src).toContain("import { z } from 'zod';");
    expect(src).toContain('export const ContactLogSchema = z.object({');

    const body = src.slice(src.indexOf('z.object('), src.indexOf('});') + 2);
    const schema = evalZod(body);
    expect(
      schema.safeParse({ Contact_Log_ID: 1, Contact_Date: '2026-05-17 14:30:00', Notes: null }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ Contact_Log_ID: 1, Contact_Date: '05/17/2026', Notes: null }).success,
    ).toBe(false);
  });
});

describe('generateIndexFile', () => {
  const now = new Date('2026-10-11T12:00:00Z');

  it('exports every type file in the directory, not only this run', () => {
    // A --search run only regenerated Contacts; the others are already there.
    const files = [
      'Contacts.ts',
      'ContactsSchema.ts',
      'Households.ts',
      'HouseholdsSchema.ts',
      'Events.ts',
      'index.ts',
    ];
    const out = generateIndexFile(files, now);
    expect(out).toContain('export * from "./Contacts";');
    expect(out).toContain('export * from "./Households";');
    expect(out).toContain('export * from "./Events";');
    expect(out).toContain('Exports all 3 table type files');
  });

  it('skips schema companions, the barrel, tests and non-ts files', () => {
    const out = generateIndexFile(['B.ts', 'BSchema.ts', 'index.ts', 'B.test.ts', 'x.d.ts', 'README.md'], now);
    expect(out.match(/export \* from/g)).toHaveLength(1);
    expect(out).not.toContain('BSchema');
  });

  it('keeps a table type whose own name ends in Schema', () => {
    // Table "Foo_Schema" -> FooSchema.ts + FooSchemaSchema.ts, with no Foo.ts.
    const out = generateIndexFile(['FooSchema.ts', 'FooSchemaSchema.ts'], now);
    expect(out).toContain('export * from "./FooSchema";');
    expect(out).not.toContain('"./FooSchemaSchema"');
  });

  it('is sorted and deterministic', () => {
    const out = generateIndexFile(['Zeta.ts', 'Alpha.ts', 'Mid.ts'], now);
    expect(out.indexOf('Alpha')).toBeLessThan(out.indexOf('Mid'));
    expect(out.indexOf('Mid')).toBeLessThan(out.indexOf('Zeta'));
  });
});

describe('generateSchemaDocument', () => {
  const now = new Date('2026-10-11T12:34:56.000Z');
  const tables = [
    {
      Name: 'Contacts',
      AccessLevel: 'ReadWriteAssignDelete',
      Columns: [
        { Name: 'Contact_ID', DataType: 'Integer32', IsRequired: true, Size: 4, IsPrimaryKey: true },
        {
          Name: 'Household_ID',
          DataType: 'Integer32',
          IsRequired: false,
          Size: 4,
          IsForeignKey: true,
          ReferencedTable: 'Households',
        },
      ],
    },
    { Name: 'Account_Types', AccessLevel: 'Read', Columns: [] },
  ] as unknown as TableMetadata[];

  it('targets the committed mp-schema catalog', () => {
    expect(SCHEMA_DOC_PATH).toBe('.claude/references/mp-schema/tables.md');
  });

  it('emits the catalog frontmatter with last_verified', () => {
    const md = generateSchemaDocument(tables, './src/lib/providers/ministry-platform/models', now);
    expect(
      md.startsWith(
        '---\ntitle: Ministry Platform Schema — Tables\ndomain: mp-schema\ntype: generated-reference\n' +
          'last_verified: 2026-10-11\nsource: npm run mp:generate:models\n---\n',
      ),
    ).toBe(true);
    expect(md).toContain('## Purpose');
    expect(md).toContain('**Generated (source):** 2026-10-11T12:34:56.000Z | **Tables:** 2');
    expect(md).toContain('`src/lib/providers/ministry-platform/models/{PascalCaseTableName}.ts`');
  });

  it('lists tables sorted with PK/FK and access abbreviations', () => {
    const md = generateSchemaDocument(tables, 'models', now);
    expect(md.indexOf('### Account_Types [R]')).toBeLessThan(md.indexOf('### Contacts [RWAD]'));
    expect(md).toContain('PK: `Contact_ID` | FK: Household_ID→Households');
  });

  it('normalizes Windows separators in the type-file path', () => {
    const md = generateSchemaDocument(tables, 'src\\lib\\models\\', now);
    expect(md).toContain('`src/lib/models/{PascalCaseTableName}.ts`');
  });
});
