// esbuild config for sdf-vscode extension

import { build } from 'esbuild';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const req = createRequire(fileURLToPath(import.meta.url));
const pdfDistBuild = path.dirname(req.resolve('pdfjs-dist/build/pdf.js'));

// 1. Extension main — CJS bundle for VS Code extension host
await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/src/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  minify: false,
});

// 2. PDF.js v3 UMD — copy pre-built files (no re-bundling needed)
fs.copyFileSync(path.join(pdfDistBuild, 'pdf.min.js'),        'dist/pdf.js');
fs.copyFileSync(path.join(pdfDistBuild, 'pdf.worker.min.js'), 'dist/pdf.worker.js');

console.log('sdf-vscode built ✓');
