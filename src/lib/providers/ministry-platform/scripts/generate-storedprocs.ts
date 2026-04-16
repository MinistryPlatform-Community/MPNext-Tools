#!/usr/bin/env tsx

// Load environment variables in Next.js order of precedence
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment files in Next.js order of precedence
const envFiles = [
  '.env.local',
  '.env.development',
  '.env',
];

envFiles.forEach(file => {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

import { MPHelper } from "../helper";
import type { ProcedureInfo, ParameterInfo } from "../types";

interface CLIOptions {
  output: string;
  search?: string;
  help?: boolean;
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    output: path.resolve(process.cwd(), '.claude/references/ministryplatform.storedprocs.md'),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-o":
      case "--output":
        options.output = args[++i];
        break;
      case "-s":
      case "--search":
        options.search = args[++i];
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Usage: tsx generate-storedprocs.ts [options]

Prerequisites:
  Ensure your environment configuration contains the required Ministry Platform settings:
  - MINISTRY_PLATFORM_BASE_URL
  - MINISTRY_PLATFORM_CLIENT_ID
  - MINISTRY_PLATFORM_CLIENT_SECRET

  Supports .env.local, .env.development, and .env files (loaded in that order)

Options:
  -o, --output <path>    Output file path (default: .claude/references/ministryplatform.storedprocs.md)
  -s, --search <term>    Optional search term to filter procedures
  -h, --help             Show this help message

Examples:
  tsx generate-storedprocs.ts
  tsx generate-storedprocs.ts -s "Contact"
  tsx generate-storedprocs.ts -o ./my-procs-reference.md
`);
}

function validateEnvironment() {
  const requiredEnvVars = [
    'MINISTRY_PLATFORM_BASE_URL',
    'MINISTRY_PLATFORM_CLIENT_ID',
    'MINISTRY_PLATFORM_CLIENT_SECRET'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach(envVar => console.error(`  - ${envVar}`));
    console.error("\nPlease ensure your environment variables are set in .env.local, .env.development, .env, or your system environment.");
    process.exit(1);
  }
}

function groupByPrefix(procedures: ProcedureInfo[]): Map<string, ProcedureInfo[]> {
  const groups = new Map<string, ProcedureInfo[]>();

  for (const proc of procedures) {
    const underscoreIndex = proc.Name.indexOf('_');
    const prefix = underscoreIndex > 0 ? proc.Name.substring(0, underscoreIndex) : "Other";

    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(proc);
  }

  // Sort procedures within each group alphabetically
  for (const [, procs] of groups) {
    procs.sort((a, b) => a.Name.localeCompare(b.Name));
  }

  // Return groups sorted alphabetically, with "Other" last
  const sorted = new Map<string, ProcedureInfo[]>();
  const keys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });
  for (const key of keys) {
    sorted.set(key, groups.get(key)!);
  }

  return sorted;
}

function formatParamSignature(params: ParameterInfo[]): string {
  const inputParams = params.filter(p => p.Direction !== "ReturnValue");
  if (inputParams.length === 0) return "(no parameters)";

  return "(" + inputParams.map(p => {
    // Include size for string types where it's meaningful (not -1/max)
    if (p.DataType === "String" && p.Size > 0) {
      return `${p.Name}: ${p.DataType}(${p.Size})`;
    }
    return `${p.Name}: ${p.DataType}`;
  }).join(", ") + ")";
}

function generateDocument(procedures: ProcedureInfo[], search?: string): string {
  const groups = groupByPrefix(procedures);

  let md = "# Ministry Platform Stored Procedures Reference\n\n";
  md += "This document provides a summary of stored procedures available via the Ministry Platform API for LLM assistants working on the MPNext project.\n\n";
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Procedures:** ${procedures.length}\n`;
  if (search) {
    md += `**Filter:** "${search}"\n`;
  }
  md += "\n---\n\n";

  md += "All procedures listed with input parameters. String sizes shown where bounded, e.g. `String(50)`.\n\n";

  for (const [prefix, procs] of groups) {
    const label = prefix === "Other" ? "Other" : `${prefix}_*`;
    md += `### ${label} (${procs.length})\n\n`;
    for (const proc of procs) {
      const sig = formatParamSignature(proc.Parameters);
      md += `- \`${proc.Name}${sig}\`\n`;
    }
    md += "\n";
  }

  return md;
}

async function main() {
  const options = parseArguments();

  if (options.help) {
    showHelp();
    return;
  }

  validateEnvironment();

  console.log("Generating stored procedure reference from Ministry Platform...\n");

  try {
    const mpHelper = new MPHelper();

    console.log("Fetching stored procedure metadata...");
    const procedures = await mpHelper.getProcedures(options.search);

    console.log(`Found ${procedures.length} procedures`);
    if (options.search) {
      console.log(`Filtered by search term: "${options.search}"`);
    }

    console.log("\nGenerating reference document...");
    const markdown = generateDocument(procedures, options.search);

    // Ensure output directory exists
    const outputDir = path.dirname(options.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }

    fs.writeFileSync(options.output, markdown);
    console.log(`Written to ${options.output}`);

    const groups = groupByPrefix(procedures);
    console.log(`\n${procedures.length} procedures in ${groups.size} groups`);

  } catch (error) {
    console.error("Error generating stored procedure reference:");

    if (error instanceof Error) {
      if (error.message.includes('undefined/oauth/connect/token')) {
        console.error("Environment configuration issue - MINISTRY_PLATFORM_BASE_URL is not set properly.");
        console.error("Please check your .env file and ensure MINISTRY_PLATFORM_BASE_URL is defined.");
      } else if (error.message.includes('Failed to get client credentials token')) {
        console.error("Authentication failed - please check your Ministry Platform credentials.");
        console.error("Verify MINISTRY_PLATFORM_CLIENT_ID and MINISTRY_PLATFORM_CLIENT_SECRET in your .env file.");
      } else {
        console.error(error.message);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
