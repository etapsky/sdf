// ─── PDF Generator ────────────────────────────────────────────────────────────
// Generates visual.pdf from structured data.
// SDF_FORMAT.md Section 4.3 — visual.pdf requirements:
//   - MUST be PDF 1.4 or later
//   - MUST NOT reference external resources
//   - MUST NOT embed executable content
//   - SHOULD accurately reflect all fields in data.json

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { SDFMeta } from '../core/index.js';

export interface GeneratePDFOptions {
  meta: SDFMeta;
  data: Record<string, unknown>;
}

export async function generatePDF(options: GeneratePDFOptions): Promise<Buffer> {
  const { meta, data } = options;

  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page   = doc.addPage([595.28, 841.89]); // A4
  const margin = 56;
  const width  = 595.28;
  let y = 841.89 - margin;

  // ─── Header ───────────────────────────────────────────────────────────────

  page.drawRectangle({
    x: 0, y: 841.89 - 60,
    width, height: 60,
    color: rgb(0.10, 0.09, 0.36),
  });
  page.drawText('SDF — Smart Document Format', {
    x: margin, y: 841.89 - 38,
    size: 16, font: bold, color: rgb(1, 1, 1),
  });
  page.drawText(`v${meta.sdf_version}  ·  ${meta.document_type ?? 'document'}`, {
    x: margin, y: 841.89 - 54,
    size: 9, font, color: rgb(0.8, 0.8, 0.9),
  });

  y = 841.89 - 80;

  // ─── Section helper ───────────────────────────────────────────────────────

  const sectionTitle = (title: string) => {
    y -= 4;
    page.drawRectangle({
      x: margin, y: y - 2, width: width - margin * 2, height: 18,
      color: rgb(0.94, 0.93, 0.99),
    });
    page.drawText(title.toUpperCase(), {
      x: margin + 6, y: y + 2,
      size: 8, font: bold, color: rgb(0.20, 0.18, 0.55),
    });
    y -= 22;
  };

  const kv = (key: string, value: string) => {
    if (y < 60) return;
    page.drawText(key, {
      x: margin, y,
      size: 9, font: bold, color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(String(value), {
      x: margin + 150, y,
      size: 9, font, color: rgb(0.1, 0.1, 0.1),
      maxWidth: width - margin - 150,
    });
    y -= 14;
  };

  // ─── Meta section ─────────────────────────────────────────────────────────

  sectionTitle('Document Identity');
  kv('Document ID',   meta.document_id);
  kv('Issuer',        meta.issuer + (meta.issuer_id ? ` (${meta.issuer_id})` : ''));
  if (meta.recipient) kv('Recipient', meta.recipient + (meta.recipient_id ? ` (${meta.recipient_id})` : ''));
  kv('Created',       meta.created_at);
  if (meta.document_type)    kv('Document type',    meta.document_type);
  if (meta.document_version) kv('Document version', meta.document_version);
  if (meta.schema_id)        kv('Schema',           meta.schema_id);

  y -= 8;

  // ─── Data section ─────────────────────────────────────────────────────────

  sectionTitle('Document Data');
  renderObject(page, font, bold, data, margin, width, 0, y, (newY) => { y = newY; });

  // ─── Footer ───────────────────────────────────────────────────────────────

  page.drawLine({
    start: { x: margin, y: 36 },
    end:   { x: width - margin, y: 36 },
    thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
  });
  page.drawText(
    `SDF ${meta.sdf_version}  ·  ${meta.document_id}  ·  @etapsky/sdf-kit`,
    { x: margin, y: 22, size: 7, font, color: rgb(0.6, 0.6, 0.6) },
  );
  page.drawText(
    'This document contains a machine-readable data layer. Open with an SDF-aware reader to access structured data.',
    { x: margin, y: 12, size: 7, font, color: rgb(0.6, 0.6, 0.6) },
  );

  return Buffer.from(await doc.save());
}

// ─── Recursive object renderer ────────────────────────────────────────────────

function renderObject(
  page:   ReturnType<PDFDocument['addPage']>,
  font:   Awaited<ReturnType<PDFDocument['embedFont']>>,
  bold:   Awaited<ReturnType<PDFDocument['embedFont']>>,
  obj:    Record<string, unknown>,
  margin: number,
  width:  number,
  depth:  number,
  y:      number,
  setY:   (y: number) => void,
): void {
  const indent = depth * 12;

  for (const [key, value] of Object.entries(obj)) {
    if (y < 60 || value === null || value === undefined) continue;

    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    if (Array.isArray(value)) {
      page.drawText(`${label} (${value.length})`, {
        x: margin + indent, y,
        size: 9, font: bold, color: rgb(0.25, 0.25, 0.25),
      });
      y -= 13; setY(y);
      value.slice(0, 2).forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          page.drawText(`[${i + 1}]`, {
            x: margin + indent + 8, y,
            size: 8, font: bold, color: rgb(0.4, 0.4, 0.4),
          });
          y -= 12; setY(y);
          renderObject(page, font, bold, item as Record<string, unknown>, margin, width, depth + 2, y, (ny) => { y = ny; setY(ny); });
        }
      });
      if (value.length > 2) {
        page.drawText(`  ... +${value.length - 2} more`, {
          x: margin + indent + 8, y,
          size: 8, font, color: rgb(0.5, 0.5, 0.5),
        });
        y -= 12; setY(y);
      }
    } else if (typeof value === 'object') {
      page.drawText(label, {
        x: margin + indent, y,
        size: 9, font: bold, color: rgb(0.25, 0.25, 0.25),
      });
      y -= 13; setY(y);
      renderObject(page, font, bold, value as Record<string, unknown>, margin, width, depth + 1, y, (ny) => { y = ny; setY(ny); });
    } else {
      page.drawText(label, {
        x: margin + indent, y,
        size: 9, font: bold, color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(String(value), {
        x: margin + indent + 150, y,
        size: 9, font, color: rgb(0.1, 0.1, 0.1),
        maxWidth: width - margin - indent - 150,
      });
      y -= 13; setY(y);
    }
  }
}