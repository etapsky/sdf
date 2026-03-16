#!/usr/bin/env tsx
// ─── SDF Build CLI ────────────────────────────────────────────────────────────
// Usage:
//   tsx bin/build.ts <example-name>
//   tsx bin/build.ts invoice
//   tsx bin/build.ts nomination
//   tsx bin/build.ts gov-tax-declaration
//
// Reads data.json, schema.json, meta.json from spec/examples/<name>/,
// builds a .sdf file and writes it to poc/output/<name>.sdf

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildSDF } from '../src/producer.js';
import { SDFMeta } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const exampleName = process.argv[2];

  if (!exampleName) {
    console.error('Usage: tsx bin/build.ts <example-name>');
    console.error('');
    console.error('Available examples:');
    console.error('  invoice');
    console.error('  nomination');
    console.error('  purchase-order');
    console.error('  gov-tax-declaration');
    console.error('  gov-customs-declaration');
    console.error('  gov-permit-application');
    console.error('  gov-health-report');
    process.exit(1);
  }

  const examplesDir = join(__dirname, '../../examples', exampleName);
  const outputDir   = join(__dirname, '../output');

  // Read source files
  console.log(`\n▸ Reading example: ${exampleName}`);

  let data: Record<string, unknown>;
  let schema: Record<string, unknown>;
  let sourceMeta: SDFMeta;

  try {
    data       = JSON.parse(await readFile(join(examplesDir, 'data.json'),   'utf-8'));
    schema     = JSON.parse(await readFile(join(examplesDir, 'schema.json'), 'utf-8'));
    sourceMeta = JSON.parse(await readFile(join(examplesDir, 'meta.json'),   'utf-8'));
  } catch (err) {
    console.error(`✗ Could not read example files from: ${examplesDir}`);
    console.error(`  Make sure spec/examples/${exampleName}/ exists with data.json, schema.json, meta.json`);
    process.exit(1);
  }

  console.log(`  data.json    — ${Object.keys(data).length} top-level fields`);
  console.log(`  schema.json  — $id: ${(schema as Record<string, string>).$id ?? '(none)'}`);
  console.log(`  meta.json    — issuer: ${sourceMeta.issuer}`);

  // Build SDF
  console.log('\n▸ Building SDF...');

  const buffer = await buildSDF({
    data,
    schema,
    issuer:       sourceMeta.issuer,
    issuerId:     sourceMeta.issuer_id,
    documentType: sourceMeta.document_type,
    recipient:    sourceMeta.recipient,
    recipientId:  sourceMeta.recipient_id,
    schemaId:     sourceMeta.schema_id,
    tags:         sourceMeta.tags,
  });

  // Write output
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${exampleName}.sdf`);
  await writeFile(outputPath, buffer);

  const kb = (buffer.length / 1024).toFixed(1);
  console.log(`  ✓ ${exampleName}.sdf written (${kb} KB)`);
  console.log(`  → ${outputPath}`);
  console.log('\n  The .sdf file is a ZIP archive. You can inspect it with:');
  console.log(`    unzip -l ${outputPath}`);
  console.log(`    tsx bin/read.ts ${exampleName}`);
}

main().catch((err) => {
  console.error('\n✗ Build failed:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});