/**
 * Build SQL Install Script
 *
 * Combines all SQL files from the ministry-platform db/ directory into a unified
 * install script for SQL Server deployment during build process.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const SQL_DIR = join(__dirname, '..', 'db');
const OUTPUT_DIR = join(__dirname, '..', '..', '..', '..', '..', '_INSTALL');
const OUTPUT_FILE = join(OUTPUT_DIR, 'ministryplatform-install.sql');
const HASH_FILE = join(OUTPUT_DIR, '.sql-hash');

function computeSourceHash(sqlFiles: string[]): string {
  const hash = createHash('sha256');
  for (const file of sqlFiles) {
    const content = readFileSync(join(SQL_DIR, file), 'utf8');
    hash.update(content);
  }
  return hash.digest('hex');
}

function buildUnifiedSQL(): void {
  console.log('Building unified SQL install script...');

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }

  const sqlFiles = readdirSync(SQL_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    console.log('No SQL files found, skipping build');
    return;
  }

  console.log(`Found ${sqlFiles.length} SQL files:`, sqlFiles);

  const currentHash = computeSourceHash(sqlFiles);
  if (existsSync(HASH_FILE) && existsSync(OUTPUT_FILE)) {
    const previousHash = readFileSync(HASH_FILE, 'utf8').trim();
    if (previousHash === currentHash) {
      console.log('SQL files unchanged, skipping rebuild');
      return;
    }
  }

  let unifiedContent = `-- =============================================
-- Ministry Platform Database Install Script
-- Generated: ${new Date().toISOString()}
-- Auto-generated - Do not edit manually
-- =============================================
-- NOTE: Run this script against your Ministry Platform database
-- =============================================

-- Set session options for consistency
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET NOCOUNT ON
GO

PRINT 'Starting Ministry Platform database installation...'
GO

`;

  sqlFiles.forEach((file, index) => {
    const content = readFileSync(join(SQL_DIR, file), 'utf8');

    unifiedContent += `
-- =============================================
-- FILE: ${file}
-- =============================================

`;

    // Remove USE statements and SET statements at the top of individual files
    // to avoid conflicts with our unified script settings
    const cleanContent = content
      .replace(/^USE\s+\[.*?\]\s*GO\s*/gim, '')
      .replace(/^SET\s+ANSI_NULLS\s+(ON|OFF)\s*GO\s*/gim, '')
      .replace(/^SET\s+QUOTED_IDENTIFIER\s+(ON|OFF)\s*GO\s*/gim, '')
      .trim();

    unifiedContent += cleanContent;

    if (index < sqlFiles.length - 1) {
      unifiedContent += '\n\nGO\n';
    }
  });

  unifiedContent += `

GO

PRINT 'Ministry Platform database installation completed successfully.'
GO
`;

  writeFileSync(OUTPUT_FILE, unifiedContent, 'utf8');
  writeFileSync(HASH_FILE, currentHash, 'utf8');

  console.log(`Created unified SQL script: ${OUTPUT_FILE}`);
  console.log(`Script size: ${Math.round(statSync(OUTPUT_FILE).size / 1024)}KB`);
}

buildUnifiedSQL();
