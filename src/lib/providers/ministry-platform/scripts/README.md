# Ministry Platform Type Generator

A CLI utility that generates TypeScript interfaces and Zod schemas from your Ministry Platform database schema.

## Features

- ✅ **Column Metadata**: Generates precise TypeScript interfaces from Ministry Platform's column schema
- ✅ **Type Mapping**: Maps Ministry Platform data types to appropriate TypeScript types
- ✅ **Length Constraints**: Includes max length information for string fields with JSDoc comments
- ✅ **Type Annotations**: Rich type information (email, phone, URL, GUID, etc.)
- ✅ **Foreign Key Documentation**: Automatically documents foreign key relationships
- ✅ **Field Annotations**: Includes comments for primary keys, foreign keys, read-only, and computed fields
- ✅ **Access Level Info**: Documents table access levels and special permissions
- ✅ **Nullable Handling**: Properly handles required vs optional fields
- ✅ **Zod Schema Generation**: Optional runtime validation schemas with length and type constraints
- ✅ **Flexible Output**: Choose your output directory
- ✅ **Search Filtering**: Generate types for specific tables only
- ✅ **Auto-generated Index**: Creates an `index.ts` barrel re-exporting every generated **interface** file (the `*Schema.ts` files are not re-exported — import them by path)

## Prerequisites

Ensure your environment contains the required Ministry Platform configuration:

```env
MINISTRY_PLATFORM_BASE_URL=https://your-domain.ministryplatform.com/ministryplatformapi
MINISTRY_PLATFORM_CLIENT_ID=your_client_id
MINISTRY_PLATFORM_CLIENT_SECRET=your_client_secret
```

Supports `.env.local`, `.env.development`, and `.env` files (loaded in that order).

### Always run with `--conditions=react-server`

The generators import `MPHelper`, and the MP client modules start with
`import 'server-only'`. That package throws unless it is resolved under the
`react-server` export condition, which Next applies to server code but plain
Node does not. Every direct `tsx` command below passes the flag. The
`npm run mp:generate*` scripts include it too, so `npm run mp:generate -- <options>`
is the shorter form.

## Usage

### Basic Usage

```bash
# Generate types for all tables
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts

# Generate with Zod schemas
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts --zod

# Generate to models directory
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts -o src/lib/providers/ministry-platform/models
```

### Advanced Options

```bash
# Generate detailed types by sampling records
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts --detailed

# Generate types for specific tables
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts --search "Contact"

# Custom output directory with Zod schemas
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts --output ./src/types/mp --zod

# Detailed mode with custom sample size
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts --detailed --sample-size 10

# Combine options
npx tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts \
  --detailed \
  --search "Contact" \
  --output ./types \
  --sample-size 5 \
  --zod
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output directory for generated types | `./generated-types` |
| `--search` | `-s` | Filter tables by search term | (none) |
| `--detailed` | `-d` | Sample records to infer types — only for tables that have no column metadata | `false` |
| `--sample-size` | | Number of records to sample in detailed mode | `5` |
| `--zod` | `-z` | Generate Zod schemas for runtime validation | `false` |
| `--clean` | `-c` | Delete every `.ts` file in an existing output directory before generating | `false` |
| `--help` | `-h` | Show help message | |

## Output Examples

### Standard Interface

Excerpt of the committed `models/Contacts.ts`:

```typescript
/**
 * Interface for Contacts
* Table: Contacts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface Contacts {

  Contact_ID: number /* 32-bit integer */; // Primary Key

  /**
   * Max length: 125 characters
   */
  Display_Name: string /* max 125 chars */;

  /**
   * Max length: 254 characters
   */
  Email_Address?: string /* email, max 254 chars */ | null;

  Mobile_Phone?: string /* phone number */ | null;

  Contact_GUID: string /* GUID/UUID */; // Has Default

  // ... additional fields
}

export type ContactsRecord = Contacts;
```

### Zod Schema (with --zod flag)

```typescript
import { z } from 'zod';

export const ContactsSchema = z.object({
  Contact_ID: z.number().int(),
  Display_Name: z.string().max(125),
  Email_Address: z.string().email().max(254).nullable(),
  Mobile_Phone: z.string().nullable(),
  Contact_GUID: z.string().uuid(),
  // ... additional fields
});

export type ContactsInput = z.infer<typeof ContactsSchema>;
```

## Using Generated Types

```typescript
import { MPHelper } from '@/lib/providers/ministry-platform';
import { Contacts } from './generated-types';                   // barrel: interfaces only
import { ContactsSchema } from './generated-types/ContactsSchema'; // schemas: import by path

const mp = new MPHelper();

// Type-safe queries
const contacts = await mp.getTableRecords<Contacts>({
  table: 'Contacts',
  filter: 'Email_Address IS NOT NULL'
});

// With Zod validation
const validatedContact = ContactsSchema.parse(incomingData);
await mp.createTableRecords('Contacts', [validatedContact]);
```

## Recommended Workflow

1. Regenerate the committed models (all tables, cleaned first):
   ```bash
   npm run mp:generate:models
   ```
   Do **not** combine `-o src/lib/providers/ministry-platform/models` with `--search`: `index.ts` is rewritten from only the tables generated in that run, so the barrel would lose every other table.

2. Import and use in your app:
   ```typescript
   import { ContactLog } from '@/lib/providers/ministry-platform/models';
   import { ContactLogSchema } from '@/lib/providers/ministry-platform/models/ContactLogSchema';
   ```

3. Re-run when schema changes to keep types in sync

## Package.json Scripts

Already defined in `package.json`:

```json
{
  "scripts": {
    "mp:generate": "tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts",
    "mp:generate:models": "tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-types.ts -o src/lib/providers/ministry-platform/models --zod --clean",
    "mp:generate:storedprocs": "tsx --conditions=react-server src/lib/providers/ministry-platform/scripts/generate-storedprocs.ts",
    "mp:build:install": "tsx src/lib/providers/ministry-platform/scripts/build-sql-install.ts"
  }
}
```

## Other scripts in this folder

- `generate-storedprocs.ts` — writes a stored-procedure reference (default `.claude/references/ministryplatform.storedprocs.md`; `-o`, `-s`, `-h`). The curated copy lives at `.claude/references/mp-schema/stored-procs.md`.
- `build-sql-install.ts` — combines `../db/*.sql` into `_INSTALL/ministryplatform-install.sql`; skips when the content hash is unchanged. Imports nothing from the provider, so it needs no `--conditions` flag.
- `codegen-escape.ts` — escaping helpers (`propertyKey`, `commentText`, `positiveInt`) for MP metadata interpolated into generated source.

The type generator also writes a schema summary to `.claude/references/ministryplatform.schema.md`; the curated copy is `.claude/references/mp-schema/tables.md`.
