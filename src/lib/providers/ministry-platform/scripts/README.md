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
- ✅ **Auto-generated Index**: Creates barrel exports for easy importing

## Prerequisites

Ensure your environment contains the required Ministry Platform configuration:

```env
MINISTRY_PLATFORM_BASE_URL=https://your-domain.ministryplatformapi.com
MINISTRY_PLATFORM_CLIENT_ID=your_client_id
MINISTRY_PLATFORM_CLIENT_SECRET=your_client_secret
```

Supports `.env.local`, `.env.development`, and `.env` files (loaded in that order).

## Usage

### Basic Usage

```bash
# Generate types for all tables
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts

# Generate with Zod schemas
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --zod

# Generate to models directory
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -o src/lib/providers/ministry-platform/models
```

### Advanced Options

```bash
# Generate detailed types by sampling records
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --detailed

# Generate types for specific tables
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --search "Contact"

# Custom output directory with Zod schemas
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --output ./src/types/mp --zod

# Detailed mode with custom sample size
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts --detailed --sample-size 10

# Combine options
npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts \
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
| `--detailed` | `-d` | Generate detailed types by sampling records | `false` |
| `--sample-size` | | Number of records to sample in detailed mode | `5` |
| `--zod` | `-z` | Generate Zod schemas for runtime validation | `false` |
| `--help` | `-h` | Show help message | |

## Output Examples

### Standard Interface

```typescript
/**
 * Interface for Contacts
 * Table: Contacts
 * Access Level: ReadWriteAssignDelete
 * Special Permissions: FileAttach, DataExport, SecureRecord
 * Generated from column metadata
 */
export interface ContactsRecord {
  Contact_ID: number; // Primary Key
  
  /**
   * Max length: 125 characters
   */
  Display_Name: string;
  
  /**
   * Max length: 254 characters
   */
  Email_Address?: string /* email */ | null;
  
  Mobile_Phone?: string /* phone number */ | null;
  Contact_GUID: string /* GUID/UUID */;
  
  // ... additional fields
}

export type Contacts = ContactsRecord;
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
import { Contacts, ContactsSchema } from './generated-types';

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

1. Generate types to the models directory:
   ```bash
   npx tsx src/lib/providers/ministry-platform/scripts/generate-types.ts \
     -o src/lib/providers/ministry-platform/models \
     --zod \
     --search "Contact"
   ```

2. Import and use in your app:
   ```typescript
   import { ContactLog, ContactLogSchema } from '@/lib/providers/ministry-platform/models';
   ```

3. Re-run when schema changes to keep types in sync

## Package.json Scripts

Add to your `package.json` for easier access:

```json
{
  "scripts": {
    "mp:generate": "tsx src/lib/providers/ministry-platform/scripts/generate-types.ts",
    "mp:generate:models": "tsx src/lib/providers/ministry-platform/scripts/generate-types.ts -o src/lib/providers/ministry-platform/models --zod"
  }
}
```

Then run with:
```bash
npm run mp:generate
npm run mp:generate:models
```
