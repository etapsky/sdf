#!/usr/bin/env tsx
// ─── SDF Read CLI ─────────────────────────────────────────────────────────────
// Usage:
//   tsx bin/read.ts <example-name>
//   tsx bin/read.ts invoice
//   tsx bin/read.ts nomination
//
// Reads output/<example-name>.sdf, parses and validates it,
// then prints a structured inspection report to stdout.

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseSDF } from '../src/reader.js';
import { SDFError } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const exampleName = process.argv[2];

  if (!exampleName) {
    console.error('Usage: tsx bin/read.ts <example-name>');
    process.exit(1);
  }

  const sdfPath = join(__dirname, '../output', `${exampleName}.sdf`);

  console.log(`\n▸ Reading: ${sdfPath}`);

  let buffer: Buffer;
  try {
    buffer = await readFile(sdfPath);
  } catch {
    console.error(`✗ File not found: ${sdfPath}`);
    console.error(`  Run first: tsx bin/build.ts ${exampleName}`);
    process.exit(1);
  }

  console.log(`  File size: ${(buffer.length / 1024).toFixed(1)} KB`);

  // Parse and validate
  console.log('\n▸ Parsing and validating...');

  let result: Awaited<ReturnType<typeof parseSDF>>;
  try {
    result = await parseSDF(buffer);
  } catch (err) {
    if (err instanceof SDFError) {
      console.error(`\n✗ ${err.code}`);
      console.error(`  ${err.message}`);
      if (err.file)    console.error(`  File: ${err.file}`);
      if (err.details) console.error(`  Details:`, JSON.stringify(err.details, null, 2));
    } else {
      console.error('\n✗ Unexpected error:', err);
    }
    process.exit(1);
  }

  const { meta, data, schema, pdfBytes } = result;

  // ─── Inspection report ──────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(60));
  console.log('  SDF INSPECTION REPORT');
  console.log('─'.repeat(60));

  // Validation status
  console.log('\n  ✓ Archive structure   valid');
  console.log('  ✓ meta.json           valid');
  console.log('  ✓ schema.json         valid JSON Schema');
  console.log('  ✓ data.json           valid against schema');
  console.log(`  ✓ visual.pdf          present (${(pdfBytes.length / 1024).toFixed(1)} KB)`);

  // Meta
  console.log('\n' + '─'.repeat(60));
  console.log('  META.JSON');
  console.log('─'.repeat(60));
  console.log(`  sdf_version    ${meta.sdf_version}`);
  console.log(`  document_id    ${meta.document_id}`);
  console.log(`  issuer         ${meta.issuer}${meta.issuer_id ? ` (${meta.issuer_id})` : ''}`);
  if (meta.recipient) {
    console.log(`  recipient      ${meta.recipient}${meta.recipient_id ? ` (${meta.recipient_id})` : ''}`);
  }
  console.log(`  created_at     ${meta.created_at}`);
  if (meta.document_type)    console.log(`  document_type  ${meta.document_type}`);
  if (meta.schema_id)        console.log(`  schema_id      ${meta.schema_id}`);
  if (meta.tags?.length)     console.log(`  tags           ${meta.tags.join(', ')}`);

  // Schema
  const schemaId = (schema as Record<string, string>).$id;
  const schemaTitle = (schema as Record<string, string>).title;
  console.log('\n' + '─'.repeat(60));
  console.log('  SCHEMA.JSON');
  console.log('─'.repeat(60));
  if (schemaTitle) console.log(`  title          ${schemaTitle}`);
  if (schemaId)    console.log(`  $id            ${schemaId}`);

  const required = (schema as Record<string, string[]>).required ?? [];
  const props = Object.keys((schema as Record<string, Record<string, unknown>>).properties ?? {});
  console.log(`  required       [${required.join(', ')}]`);
  console.log(`  properties     ${props.length} fields defined`);

  // Data
  console.log('\n' + '─'.repeat(60));
  console.log('  DATA.JSON');
  console.log('─'.repeat(60));
  printObject(data, '  ', 0);

  console.log('\n' + '─'.repeat(60));
  console.log(`  ✓ ${exampleName}.sdf is a valid SDF ${meta.sdf_version} document`);
  console.log('─'.repeat(60) + '\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function printObject(
  obj: Record<string, unknown>,
  prefix: string,
  depth: number,
): void {
  if (depth > 3) {
    console.log(`${prefix}  [... nested object]`);
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      console.log(`${prefix}${key}: [${value.length} items]`);
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        printObject(value[0] as Record<string, unknown>, prefix + '  [0] ', depth + 1);
        if (value.length > 1) {
          console.log(`${prefix}  ... +${value.length - 1} more`);
        }
      }
    } else if (typeof value === 'object') {
      console.log(`${prefix}${key}:`);
      printObject(value as Record<string, unknown>, prefix + '  ', depth + 1);
    } else {
      const display = String(value).length > 60
        ? String(value).slice(0, 57) + '...'
        : String(value);
      console.log(`${prefix}${key.padEnd(22)} ${display}`);
    }
  }
}

main().catch((err) => {
  console.error('\n✗ Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
});